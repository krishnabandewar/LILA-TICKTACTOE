FROM heroiclabs/nakama:3.23.0

# Copy your modules
COPY ./nakama/modules /nakama/data/modules

# Using a shell to evaluate the environment variables correctly on Render
ENTRYPOINT sh -c "/nakama/nakama migrate up --database.address $NAKAMA_DATABASE_ADDRESS && /nakama/nakama --database.address $NAKAMA_DATABASE_ADDRESS --runtime.path /nakama/data/modules"
