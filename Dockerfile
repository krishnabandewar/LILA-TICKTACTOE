FROM heroiclabs/nakama:3.23.0
COPY ./nakama/modules /nakama/data/modules
COPY start.sh /nakama/start.sh
RUN chmod +x /nakama/start.sh
ENTRYPOINT ["/bin/sh", "/nakama/start.sh"]
