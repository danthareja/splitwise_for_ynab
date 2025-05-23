# TODO

1. Replace upstash logic
  1. Maybe instead of just get/set the interface is getYNABServerKnowledge and getSplitwiseLastProcessed
  1. Can have different adapters -- could read-write specific keys for redis self hosting, but for our case, we want to save in prisma. getSplitwiseLastProcessed can be the last successful syncHistory completedAt. getYnabServerKnowledge will have to be saved somewhere (maybe also on the last syncHistory?)
  1. When an emoji is changed, make sure to update getSplitwiseLastProcessed, otherwise it'll pick up all the old ones
1. Allow configurable success flag in glue
1. When flags settings are updated, name them in the budget
1. Rename fields in SplitwiseSettings
1. Fix date bug on sync -- YNAB to splitwise shows a different day than Splitwise to YNAB
1. DRY up services/splitwise-auth and ynab-api
1. Fix build errors and deploy
1. Re-think self-hosted capability
1. How do YNAB Together budgets work? Can I make this easy for clients to use with their ynab together logins?