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

# Data Management
- Always bear in mind that although now we use local json files as database, they will be replaced by remote postgresql in the future
- Any data interactions must be implemented via API abstraction to make it easier to replace local files with actual db in the future

# UI/UX Guidelines
- any time UI changes are made they should be checked for mobile screens
- all UI elements must be good-looking, modern and UX-friendly.

# Architecture
## Storage
 - Initially local json files
 - Later will be switched to PostgreSQL
## API
 - all data operations (query and manipulation) must be implemented via API
## Authentication/Authorization
 - On the first stage (implementing functional requirements) authorization is not needed
 - On the second stage role-based access functionality to application features must be implemented
