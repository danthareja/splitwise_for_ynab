# TODO

1. Replace upstash logic
  1. Maybe instead of just get/set the interface is getYNABServerKnowledge and getSplitwiseLastProcessed
  1. Can have different adapters -- redis for self/host, prisma for app
  1. When sync marker is changed, make sure to update splitwiselastprocessed, otherwise it'll pick up all the old ones
1. Allow configurable success flag in glue
1. When flags settings are updated, name them in the budget
1. Rename fields in SplitwiseSettings
1. Fix date bug on sync -- YNAB to splitwise shows a different day than Splitwise to YNAB
1. Fix build errors and deploy
1. Re-think self-hosted capability
1. How do YNAB Together budgets work? Can I make this easy for clients to use with their ynab together logins?