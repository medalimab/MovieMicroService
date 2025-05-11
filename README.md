<!-- Logo du projet -->
<p align="center">
  <img src="https://img.icons8.com/fluency/96/api-settings.png" alt="API Gateway Logo" width="120"/>
</p>

# API Gateway TP7-SOA

---

> **Passerelle moderne pour microservices Films & Séries TV**

---

Ce projet est une passerelle API (API Gateway) pour un système de gestion de films et de séries TV, utilisant Node.js, Express, Apollo Server (GraphQL), gRPC et Kafka.

## 🚀 Fonctionnalités
- Expose des endpoints **REST** et **GraphQL** pour interagir avec les microservices de films et de séries TV.
- Communication avec les microservices via **gRPC**.
- Publication d'événements sur **Kafka** lors de la création de films ou de séries.
- Gestion des **CORS** et du parsing **JSON**.

## 🗂️ Structure du projet
- `apiGateway.js` : Point d'entrée principal, configuration des routes REST, GraphQL, gRPC et Kafka.
- `movieMicroservice.js` : Microservice gRPC pour la gestion des films.
- `tvShowMicroservice.js` : Microservice gRPC pour la gestion des séries TV.
- `movie.proto` / `tvShow.proto` : Définitions des services gRPC.
- `resolvers.js` / `schema.js` : Schéma et résolveurs GraphQL.

## ⚙️ Installation
1. Cloner le dépôt.
2. Installer les dépendances :
   ```bash
   npm install
   ```

## ▶️ Lancement
1. Démarrer les microservices gRPC (`movieMicroservice.js` et `tvShowMicroservice.js`).
2. Démarrer Kafka (assurez-vous que le broker tourne sur `localhost:9092`).
3. Lancer la passerelle API :
   ```bash
   node apiGateway.js
   ```

## 📚 Endpoints REST
- `GET /movies` : Liste des films (paramètre optionnel `query`).
- `GET /movies/:id` : Détails d'un film.
- `POST /movies` : Créer un film (`id`, `title`, `description`).
- `GET /tvshows` : Liste des séries (paramètre optionnel `query`).
- `GET /tvshows/:id` : Détails d'une série.
- `POST /tvshows` : Créer une série (`id`, `title`, `description`).

## 🎯 Endpoint GraphQL
Accessible sur `/graphql` (via Apollo Server).

## 🛠️ Technologies principales
- Node.js, Express
- Apollo Server (GraphQL)
- gRPC
- Kafka (kafkajs)

---

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white"/>
  <img src="https://img.shields.io/badge/gRPC-4285F4?style=for-the-badge&logo=grpc&logoColor=white"/>
  <img src="https://img.shields.io/badge/Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white"/>
</p>

---



