# Permissions to run
- Do not run linter
# Apply changes
- apply css changes automatically
- always ask before apply other changes
# Application description
- Application to handle tournaments. 
- Each tournament has schema, participants (persons or teams) and stages
- Stages consist of games. 
- Games consist of themes.
- Theme consists of 5 questions with the value from 10 to 50.
- If player answers correctly, it adds question value to his score. If not correctly, score is decreased.

# Technologies
- NextJs application
- No typescript
- use Tanstack Query
- use pure css only, no UI packages
- use react-icons
- all data changes should be made via api. For the first stage json is used as db. In future PostgreSQL will be used
