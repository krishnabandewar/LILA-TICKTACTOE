FROM heroiclabs/nakama:3.23.0

# Copy modules
COPY ./nakama/modules /nakama/data/modules

# We don't need a complex CMD. Nakama automatically picks up 
# environment variables starting with NAKAMA_
ENTRYPOINT /nakama/nakama migrate up && /nakama/nakama --runtime.path /nakama/data/modules
