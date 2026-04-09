FROM heroiclabs/nakama:3.23.0
COPY ./nakama/modules /nakama/data/modules
# Explicitly passing the address flag using the NK_ variable
ENTRYPOINT /nakama/nakama --database.address $NK_DATABASE_ADDRESS --runtime.path /nakama/data/modules --session.cors_allowed_origins "*"
