import neo4j from 'neo4j-driver';
import config from '../config';

if (!config.neo4jUri || !config.neo4jUser || !config.neo4jPassword) {
    throw new Error('Missing Neo4j environment variables.');
}

export const driver = neo4j.driver(config.neo4jUri, neo4j.auth.basic(config.neo4jUser, config.neo4jPassword));
