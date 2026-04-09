FROM heroiclabs/nakama:3.23.0

COPY ./nakama/modules /nakama/data/modules
COPY ./nakama/local.yml /nakama/data/local.yml

CMD /nakama/nakama migrate up --database.address ${DATABASE_ADDRESS} && \
    /nakama/nakama \
      --name nakama1 \
      --database.address ${DATABASE_ADDRESS} \
      --logger.level INFO \
      --runtime.path /nakama/data/modules \
      
