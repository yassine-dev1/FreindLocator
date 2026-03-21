# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down -v

# Voir les logs en temps réel
docker-compose logs -f

# Redémarrer un service spécifique
docker-compose restart postgres

# Exécuter une commande dans un conteneur
docker exec -it friendlocato_postgres psql -U friendlocato_user -d friendlocato

# Sauvegarder la base de données
docker exec friendlocato_postgres pg_dump -U friendlocato_user friendlocato > backup.sql

# Restaurer la base de données
cat backup.sql | docker exec -i friendlocato_postgres psql -U friendlocato_user friendlocato


****************************************************************
docker logs friendlocato_postgres

# 2. Vérifiez l'état du conteneur
docker inspect friendlocato_postgres | findstr -i "health"

# 3. Essayez de démarrer seulement PostgreSQL pour voir l'erreur
docker-compose stop postgres
docker-compose rm -f postgres
docker-compose up -d postgres
docker logs -f friendlocato_postgres

*****************************************************************
# 4. Redémarrez Docker Desktop
net stop com.docker.service
net start com.docker.service


********************************************* test postgreSql****************************
docker exec -it friendlocato_postgres psql -U ILISI -d friendlocato -c "SELECT version();"
docker logs -f friendlocato_postgres

