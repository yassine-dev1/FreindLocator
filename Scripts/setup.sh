#!/bin/bash
# friend-locato/scripts/setup.sh

echo "🚀 Configuration de Friend Locato..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down -v

# Nettoyer les volumes orphelins
echo "🧹 Nettoyage des volumes..."
docker volume prune -f

# charger les images postgre et psAdmin
docker pull postgres:15-alpine
docker pull dpage/pgadmin4:7
docker pull redis:7-alpine

# Démarrer les services
echo "📦 Démarrage des services Docker..."
docker-compose up -d

# afficher images
docker images 

# Testez PostgreSQL
docker exec -it friendlocato_postgres psql -U friendlocato_user -d friendlocato -c "SELECT version();"

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
sleep 10

# Vérifier l'état des conteneurs
echo "📊 État des conteneurs :"
docker-compose ps

# Afficher les logs
echo "📝 Logs des conteneurs :"
docker-compose logs --tail=50

echo "status du postgree :"
docker inspect friendlocato_postgres | findstr -i "health"

echo ""
echo "✅ Configuration terminée !"
echo "📌 PostgreSQL est accessible sur lchmo"
echo "📌 PgAdmin est accessible sur http://localhost:5050"
echo "   Email: admin@friendlocato.com"
echo "   Mot de passe: admin123"
echo "📌 Redis est accessible sur localhost:6379"
echo ""
echo "Pour arrêter les services : docker-compose down"
echo "Pour voir les logs : docker-compose logs -f"