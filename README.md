# Friend Locato 📍

Application mobile de partage de position en temps réel entre amis, construite avec React Native, NestJS et PostgreSQL.

## 📋 Table des matières
- [Aperçu du projet](#aperçu-du-projet)
- [Stack technique](#stack-technique)
- [Architecture du projet](#architecture-du-projet)
- [Roadmap détaillé](#roadmap-détaillé)
- [Installation et démarrage](#installation-et-démarrage)
- [Structure des dossiers](#structure-des-dossiers)
- [API Documentation](#api-documentation)
- [Base de données](#base-de-données)
- [Fonctionnalités](#fonctionnalités)
- [Contribuer](#contribuer)
- [Licence](#licence)

## 🎯 Aperçu du projet

Friend Locato permet à des groupes d'amis de partager leur position géographique en temps réel, avec un contrôle précis de la confidentialité. L'application offre :

- 🔐 Authentification sécurisée (JWT)
- 📍 Partage de position en temps réel
- 👥 Gestion des relations d'amitié
- 🗺️ Carte interactive des positions
- ⚡ Mises à jour instantanées (WebSocket)
- 🔒 Contrôle avancé de la confidentialité
- 📱 Mode hors-ligne
- 🔔 Notifications push

## 🛠️ Stack technique

### Backend
- **Framework** : NestJS (Node.js)
- **Base de données** : PostgreSQL avec TypeORM
- **Temps réel** : Socket.io
- **Authentification** : JWT + Passport
- **Documentation API** : Swagger
- **Tests** : Jest
- **Conteneurisation** : Docker

### Mobile
- **Framework** : React Native (TypeScript)
- **Navigation** : React Navigation
- **État global** : Redux Toolkit + RTK Query
- **Géolocalisation** : react-native-maps + react-native-background-geolocation
- **WebSocket** : Socket.io-client
- **Stockage local** : AsyncStorage
- **Notifications** : Firebase Cloud Messaging
- **Tests** : Jest + React Native Testing Library

### DevOps
- **CI/CD** : GitHub Actions
- **Conteneurisation** : Docker + Docker Compose
- **Reverse Proxy** : Nginx
- **Monitoring** : Sentry
- **Base de données** : PostgreSQL avec pgAdmin

## 🏗️ Architecture du projet

### Architecture globale
┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐
│ Mobile App │────▶│ API Gateway │────▶│ WebSocket │
│ React Native │◀────│ NestJS │◀────│ Server │
└─────────────────┘ └────────┬─────────┘ └──────────────┘
│
┌───────▼────────┐
│ PostgreSQL │
│ + TypeORM │
└────────────────┘

### Architecture détaillée

friend-locato/
├── backend/ # API NestJS
│ ├── src/
│ │ ├── main.ts # Point d'entrée
│ │ ├── app.module.ts # Module racine
│ │ ├── config/ # Configuration
│ │ ├── common/ # Code partagé
│ │ │ ├── guards/ # Guards d'authentification
│ │ │ ├── interceptors/ # Intercepteurs HTTP
│ │ │ ├── filters/ # Filtres d'exception
│ │ │ ├── pipes/ # Pipes de validation
│ │ │ └── decorators/ # Décorateurs personnalisés
│ │ └── modules/ # Modules fonctionnels
│ │ ├── auth/ # Authentification
│ │ ├── users/ # Gestion utilisateurs
│ │ ├── friends/ # Relations d'amitié
│ │ ├── location/ # Géolocalisation
│ │ └── notifications/ # Notifications push
│ ├── test/ # Tests e2e
│ ├── Dockerfile
│ └── package.json
│
├── mobile/ # Application React Native
│ ├── src/
│ │ ├── App.tsx
│ │ ├── config/ # Configuration
│ │ ├── core/ # Logique métier
│ │ │ ├── store/ # Redux store
│ │ │ ├── services/ # Services API, WebSocket
│ │ │ └── utils/ # Utilitaires
│ │ └── features/ # Fonctionnalités
│ │ ├── auth/ # Connexion/Inscription
│ │ ├── home/ # Écran principal
│ │ ├── map/ # Carte interactive
│ │ ├── friends/ # Gestion amis
│ │ └── settings/ # Paramètres
│ ├── tests/
│ └── package.json
│
├── docker/
│ ├── postgres/ # Configuration PostgreSQL
│ └── nginx/ # Configuration Nginx
│
├── docs/ # Documentation
│ ├── api/ # Documentation API
│ └── architecture/ # Documentation architecture
│
├── scripts/ # Scripts utilitaires
├── docker-compose.yml # Orchestration Docker
├── docker-compose.prod.yml # Production Docker
└── README.md # Ce fichier


## 🗺️ Roadmap détaillé

### Phase 0 : Fondations (Semaine 1)
**Objectif : Mettre en place l'environnement de développement**
- [x] Initialisation du monorepo Git
- [x] Configuration Docker et docker-compose
- [x] Mise en place ESLint + Prettier
- [x] Configuration PostgreSQL avec Docker
- [x] Structure de dossiers finale

### Phase 1 : Backend - Core (Semaines 2-3)

#### Sprint 1.1 : Infrastructure de base
**Objectif : API fonctionnelle avec authentification**
- [ ] Initialisation du projet NestJS avec TypeORM
- [ ] Configuration de la connexion PostgreSQL
- [ ] Création de l'entité `User`
- [ ] Implémentation de l'authentification JWT
  - POST `/auth/register`
  - POST `/auth/login`
  - POST `/auth/refresh`
  - POST `/auth/logout`
- [ ] Mise en place du guard d'authentification
- [ ] Configuration de Swagger pour la documentation API

**Entité User**
```typescript
{
  id: string (UUID)
  email: string (unique)
  password: string (hashé)
  name: string
  avatar: string (optionnel)
  lastActive: timestamp
  isOnline: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```
### Sprint 1.2 : Gestion des amis
  ### Objectif : Système de relations entre utilisateurs

Création de l'entité Friendship

Endpoints API :

POST /friends/request (envoyer demande)

PUT /friends/request/:id/accept (accepter)

PUT /friends/request/:id/reject (rejeter)

DELETE /friends/:id (supprimer)

GET /friends (lister amis)

GET /friends/requests (demandes en attente)

GET /friends/search?q= (rechercher)

``` typeScript
{
  id: string (UUID)
  userId: string (FK)
  friendId: string (FK)
  status: 'pending' | 'accepted' | 'blocked' | 'rejected'
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Phase 2 : Géolocalisation (Semaines 4-5)
#### Sprint 2.1 : Service de localisation
Objectif : Stocker et gérer les positions

Création de l'entité Location

Endpoints API :

POST /locations (envoyer position)

GET /locations/friends (positions amis)

PUT /locations/settings (partage on/off)

DELETE /locations/history (effacer historique)

``` Entite 
{
  id: string (UUID)
  userId: string (FK)
  latitude: decimal(10,8)
  longitude: decimal(11,8)
  accuracy: float
  speed: float (optionnel)
  heading: float (optionnel)
  timestamp: timestamp
  isSharing: boolean
}
```
### Sprint 2.2 : WebSocket en temps réel
 #### Objectif : Mise à jour instantanée des positions

Configuration de Socket.io Gateway

Gestion des connexions/déconnexions

Events WebSocket :

join (rejoindre canal)

updateLocation (maj position)

friendLocation (broadcast amis)

friendStatus (online/offline)

Rate limiting des updates

Cache des positions avec Redis (optionnel)

### Phase 3 : Mobile - Fondations (Semaines 6-7)
#### Sprint 3.1 : Setup et navigation
Objectif : Application mobile de base

Initialisation React Native avec TypeScript

Configuration React Navigation (Stack + Tab)

Mise en place Redux Toolkit + RTK Query

Création des écrans :

Onboarding

Login/Register

Home (carte)

Friends list

Profile

Settings

Services :

API (axios interceptors)

Stockage (AsyncStorage)

WebSocket

#### Sprint 3.2 : Authentification mobile
Écrans de connexion/inscription

Gestion du token JWT

Auto-login avec refresh token

Validation formulaires (Formik + Yup)

Déconnexion

### Phase 4 : Fonctionnalités principales mobile (Semaines 8-9)
### Sprint 4.1 : Carte et géolocalisation
Objectif : Affichage des positions sur carte

Intégration react-native-maps

Configuration permissions (iOS/Android)

Implémentation tracking GPS optimisé

Gestion permissions

Composant MapView avec :

Position utilisateur

Marqueurs personnalisés

Clustering

Bouton recentrer

### Sprint 4.2 : Liste des amis
Écran liste amis

Statut online/offline

Dernière position

Recherche d'amis

Gestion demandes

### Phase 5 : Améliorations et optimisation (Semaines 10-11)
### Sprint 5.1 : Mode hors-ligne
Objectif : Application fonctionnelle sans connexion

Queue positions hors-ligne

Synchronisation automatique

Cache positions

Indicateur connexion

Stockage local données

### Sprint 5.2 : Optimisations batterie
Réduction fréquence si inactif

Détection mouvement

Mode économie énergie

Arrêt automatique optionnel

### Sprint 5.3 : Notifications push
Configuration Firebase Cloud Messaging

Notifications pour :

Nouvelle demande ami

Demande acceptée

Ami proche (option)

### Phase 6 : Fonctionnalités avancées (Semaines 12-13)
###  6.1 : Géofencing
Objectif : Alertes basées sur zones

Entité Geofence

Création zones personnalisées

Notifications entrée/sortie

Partage zones avec amis

Entité Geofence

typescript
{
  id: string (UUID)
  userId: string (FK)
  name: string
  latitude: decimal(10,8)
  longitude: decimal(11,8)
  radius: integer (mètres)
  type: 'enter' | 'exit' | 'both'
  notifyFriends: boolean
  createdAt: timestamp
}
### Sprint 6.2 : Privacy avancée
Partage temporaire (1h, 24h)

Blocage utilisateurs

Masquage position à certains

Mode "fantôme"

Historique visites (opt-in)

### Phase 7 : Qualité et déploiement (Semaines 14-15)
#### Sprint 7.1 : Tests et sécurité
Backend

Tests unitaires (Jest) >80% couverture

Tests e2e endpoints critiques

Rate limiting

Validation inputs

Audit sécurité

Mobile

Tests composants

Tests intégration

Tests multi-appareils

Test permissions

#### Sprint 7.2 : CI/CD et déploiement
GitHub Actions

yaml
- Lint sur chaque PR
- Tests automatisés
- Build APK/IPA test
Déploiement backend

Configuration Docker production

Reverse proxy Nginx

SSL Let's Encrypt

Monitoring Sentry

Déploiement mobile

Génération APK signed (Android)

Configuration Apple Developer (iOS)

Préparation stores