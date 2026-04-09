FROM heroiclabs/nakama:3.23.0
COPY ./nakama/modules /nakama/data/modules
ENTRYPOINT /nakama/nakama migrate up --database.address  && /nakama/nakama --database.address  --runtime.path /nakama/data/modules --session.cors_allowed_origins "*"
