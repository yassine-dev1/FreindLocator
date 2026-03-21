-- friend-locato/docker/postgres/init.sql
-- Création des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- Pour les calculs géographiques avancés

-- Création d'un schéma dédié
CREATE SCHEMA IF NOT EXISTS friendlocato;

-- Configuration des paramètres PostgreSQL
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET huge_pages = off;
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Base de données initialisée avec succès pour Friend Locato';
END $$;