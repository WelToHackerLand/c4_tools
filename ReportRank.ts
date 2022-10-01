import axios from "axios";
import * as dotenv from "dotenv";
import { Octokit } from "@octokit/core";
import Excel from 'exceljs';
import path from 'path';
import { Command } from 'commander';

dotenv.config();

class ReportWithRiskInfo {
  constructor(
    public handle: string,
    public url: string, 
    public id: number
  ) {}
}

const getAwardForHandles = async(): Promise<{ [key:string]: number }> => {
  const awardOf: { [key:string]: number } = {};
  const response = await axios.get('https://code4rena.com/page-data/leaderboard/page-data.json');

  const edges = response.data.result.data.handles.edges;
  for (let nodeId in edges) {
    const handle = edges[nodeId].node.handle;

    const findings = edges[nodeId].node.findings;
    let award = 0;
    for (let findingId in findings) {
      award += findings[findingId].awardUSD; 
    }
    
    awardOf[handle] = award;
  }
  return awardOf;
}

const getListReportsWithRisk = async(findingRepo: string): Promise<{ [key:string]: Array<ReportWithRiskInfo> }> => {
  const accessToken = process.env.GITHUB_ACCESS_TOKEN || "";
  const octokit = new Octokit({
    auth: accessToken
  });

  const reportsWithRisk: { [key:string]: Array<ReportWithRiskInfo> } = {};
  const reports = (await octokit.request(`GET /repos/code-423n4/${findingRepo}/contents/data`)).data;
  for (let i in reports) {
    const report = reports[i];
    if (!report.name.endsWith(".json")) {
      continue;
    }
    
    // TODO: need to find another way to get content -- this way is too slow. Maybe download the repo and loop through file in local 
    const encodedContent = (await octokit.request(`GET /repos/code-423n4/${findingRepo}/contents/data/${report.name}`)).data.content;
    const fileContent = JSON.parse((Buffer.from(encodedContent.toString(), 'base64')).toString());

    const handle = report.name.substring(0, report.name.lastIndexOf('-'));
    const risk = fileContent.risk; 
    const url = fileContent.issueUrl;
    const id = fileContent.issueId;

    if (typeof reportsWithRisk[risk] == 'undefined' || reportsWithRisk[risk].length == 0) {
      reportsWithRisk[risk] = new Array();
    }
    reportsWithRisk[risk].push(new ReportWithRiskInfo(handle, url, id));
  }

  return reportsWithRisk;
}

const exportToExcelFile = async(findingRepo: string, reportsWithRisk: { [key:string]: Array<ReportWithRiskInfo> }, awardOf: { [key:string]: number } ) => {
  const workbook = new Excel.Workbook();
  const TableStructure = [
    { key: 'name', header: 'Name' },
    { key: 'reward', header: 'Reward' },
    { key: 'issueUrl', header: 'Issue URL' },
  ];

  const risks: string[] = ["3", "2", "G", "Q"];
  const riskName: string[] = ["High", "Medium", "Gas", "QA"];

  risks.forEach((risk, riskId) => {
    if (typeof reportsWithRisk[risk] == 'undefined' || reportsWithRisk[risk].length == 0) {
      return;
    }

    // sort reports follow the leaderboard 
    reportsWithRisk[risk].sort(
      (report1, report2) => (awardOf[report1.handle] < awardOf[report2.handle]) ? 1 : -1
    )
    
    const worksheet = workbook.addWorksheet(riskName[riskId]);
    worksheet.columns = TableStructure;
    
    let prevHandle = "@#$% Just a non-existed handle @#$%"
    for (const report of reportsWithRisk[risk]) {
      const handle: string = report.handle == prevHandle ? "" : report.handle;
      const reward: string = report.handle == prevHandle ? "" : awardOf[report.handle].toString();
      worksheet.addRow({
        name: handle,
        reward: reward, 
        issueUrl: report.url // TODO: need to find some workaround here { text: `issue ${report.id}`, hyperlink: report.url }
      });
      
      prevHandle = report.handle;
    }
  });

  const exportPath = path.resolve(__dirname, `${findingRepo}_rank.xlsx`);
  await workbook.xlsx.writeFile(exportPath);
}

const parseCommandLine = async(): Promise<string> => {
  const program = new Command();

  program
    .name('Sort report follow leaderboard')
    .description('Tool to sort issues of specified c4 finding repo follow the leaderboard')
    .version('0.1.0');

  // program.command('sortOnline')
  program
    .description('Get issues through github api and sort it follow the c4 leaderboard')
    .option('-r, --repo <finding-repo-name>', 'name of finding repo on code4rena repo');

  program.parse(process.argv);

  const options = program.opts();
  return options.repo;
}

const main = async() => {
  const findingRepo = await parseCommandLine();
  console.log(findingRepo);

  console.log("load leaderboard ...");
  const awardOf = await getAwardForHandles();

  console.log("load reports of contest ...");
  const reportsWithRisk = await getListReportsWithRisk(findingRepo);

  console.log("export to execel file ...");
  await exportToExcelFile(findingRepo, reportsWithRisk, awardOf);
}

main();