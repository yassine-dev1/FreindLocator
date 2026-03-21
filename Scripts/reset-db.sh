#!/bin/bash
# friend-locato/scripts/reset-db.sh

echo "🔄 Réinitialisation de la base de données..."

# Arrêter les conteneurs
docker-compose stop postgres

# Supprimer le volume
docker-compose rm -f postgres
docker volume rm friend-locato_postgres_data

# Redémarrer
docker-compose up -d postgres

echo "✅ Base de données réinitialisée"