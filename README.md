# Overview 
Provide some tools to help warden in reading issue from [code4rena](https://code4rena.com/) 
* Sort all reports of specified contest following the order of [leaderboard](https://code4rena.com/leaderboard/)
    * **Updated**: This version just support get all the data through github API --> too slow 
    * **Updated**: Let user download the finding repo and just sort !!! 

# Installation 
```
yarn install
``` 

# Enviroment setup 
You'll need to set the following environment variables:
* `GITHUB_ACCESS_TOKEN`: [Github personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). 
Just use when you want to access private finding repos of code4rena. Make sure you grant a proper access to this token. (Tool just require scope repo)

# Running 
For usage 
```
ts-node ReportRank-ts --help 
```

```
ts-node ReportRank.ts -r <repo>
```

# Example
```
ts-node ReportRank.ts -r 2022-09-y2k-finance-findings 
```

The sorted issues will look like this: 
![](https://i.imgur.com/6XQZTIU.png)

