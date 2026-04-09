FROM heroiclabs/nakama:3.23.0
COPY ./nakama/modules /nakama/data/modules
# By using the NK_ prefix in Render, we don't need any flags here!
ENTRYPOINT sh -c "/nakama/nakama migrate up && /nakama/nakama"
