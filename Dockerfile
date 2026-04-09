FROM heroiclabs/nakama:3.23.0
COPY ./nakama/modules /nakama/data/modules

# Running as a single string (shell form) so variables expand correctly
ENTRYPOINT /nakama/nakama migrate up --database.address $NK_DATABASE_ADDRESS && /nakama/nakama --database.address $NK_DATABASE_ADDRESS --runtime.path /nakama/data/modules --session.cors_allowed_origins "*"
