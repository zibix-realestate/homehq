// neo4jdb.js
const dbd = require('neo4j-driver');

class neo4j {

  // Configure the Neo4j driver


  constructor() {
    this.driver = dbd.driver(process.env.NEO4J_URI, dbd.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD), {
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 120000
    });
  }

  async query(query, parameters = {}) {
    const session = this.driver.session({database: process.env.NEO4J_DATABASE});
    try {
      const result = await session.run(query, parameters);
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('Error running query:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  close() {
    return this.driver.close();
  }





}

module.exports = new neo4j()


