const admin = require('firebase-admin');

class Firestore {
  constructor() {
    if (!admin.apps.length) {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
    }
    
    this.db = admin.firestore();
    this.FieldValue = admin.firestore.FieldValue;
    this.Timestamp = admin.firestore.Timestamp;
    
    this.db.settings({
      ignoreUndefinedProperties: true
    });
  }

  collection(name) {
    return this.db.collection(name);
  }

  async getDoc(collection, docId) {
    const doc = await this.db.collection(collection).doc(docId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  }

  async setDoc(collection, docId, data, merge = false) {
    const docRef = this.db.collection(collection).doc(docId);
    if (merge) {
      await docRef.set(data, { merge: true });
    } else {
      await docRef.set(data);
    }
    return { id: docId, ...data };
  }

  async updateDoc(collection, docId, data) {
    const docRef = this.db.collection(collection).doc(docId);
    await docRef.update(data);
    return { id: docId, ...data };
  }

  async deleteDoc(collection, docId) {
    await this.db.collection(collection).doc(docId).delete();
    return true;
  }

  async query(collection, conditions = []) {
    let query = this.db.collection(collection);
    
    for (const condition of conditions) {
      const { field, operator, value } = condition;
      query = query.where(field, operator, value);
    }
    
    const snapshot = await query.get();
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return results;
  }

  async runTransaction(callback) {
    return await this.db.runTransaction(callback);
  }

  batch() {
    return this.db.batch();
  }

  async deleteExpiredDocuments(collection, expiryField = 'expires_at') {
    const now = this.Timestamp.now();
    const expiredDocs = await this.db.collection(collection)
      .where(expiryField, '<=', now)
      .get();
    
    const batch = this.db.batch();
    expiredDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!expiredDocs.empty) {
      await batch.commit();
    }
    
    return expiredDocs.size;
  }

  generateId() {
    return this.db.collection('_').doc().id;
  }

  getTimestamp() {
    return this.Timestamp.now();
  }

  getServerTimestamp() {
    return this.FieldValue.serverTimestamp();
  }

  arrayUnion(elements) {
    return this.FieldValue.arrayUnion(...elements);
  }

  arrayRemove(elements) {
    return this.FieldValue.arrayRemove(...elements);
  }

  increment(value) {
    return this.FieldValue.increment(value);
  }

  close() {
    return admin.app().delete();
  }
}

module.exports = new Firestore();