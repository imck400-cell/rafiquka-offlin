import {
  localDB,
  ensureSeedDatabase,
  saveSystemConfigToLocalDB,
  saveSchoolSharedKeyToLocalDB,
  saveUserCollectionToLocalDB,
  getUserCollectionFromLocalDB,
} from './localDB';
import { stampRecord } from './recordStamping';

/**
 * محول محلي كامل (100% Serverless Offline Shim)
 * تم استئصال مكتبة axios وجميع الاتصالات الخارجية بـ Hostinger / Laravel نهائياً.
 * يوجّه هذا المحول أي استدعاءات متبقية مباشرةً إلى قاعدة البيانات المحلية RafiqukOfflineDB (Dexie.js).
 */
const api = {
  async get(url: string): Promise<{ data: any }> {
    await ensureSeedDatabase();

    if (url === '/sync/global') {
      const rows = await localDB.systemConfigs.toArray();
      const data: Record<string, any> = {};
      rows.forEach((r) => {
        data[r.key] = r.data;
      });
      return { data };
    }

    if (url.startsWith('/sync/standalone/')) {
      const tableName = url.replace('/sync/standalone/', '').split('?')[0];
      switch (tableName) {
        case 'GradeSheets':
          return { data: await localDB.gradeSheets.toArray() };
        case 'StudentGradeSheets':
          return { data: await localDB.studentGradeSheets.toArray() };
        case 'AllSubjectsGradeSheets':
          return { data: await localDB.allSubjectsGradeSheets.toArray() };
        case 'CaseStudies':
          return { data: await localDB.caseStudies.toArray() };
        case 'issuesAndSolutions_log':
          return { data: await localDB.issuesAndSolutions.toArray() };
        case 'SchoolActivities':
          return { data: await localDB.schoolActivities.toArray() };
        default:
          return { data: [] };
      }
    }

    const userMatch = url.match(/^\/sync\/school\/([^/]+)\/user\/([^/]+)\/data/);
    if (userMatch) {
      const schoolId = decodeURIComponent(userMatch[1]);
      const userId = decodeURIComponent(userMatch[2]);
      const rows = await localDB.userCollections
        .where('[schoolId+userId+key]')
        .between([schoolId, userId, ''], [schoolId, userId, '\uffff'])
        .toArray();
      const data: Record<string, any> = {};
      rows.forEach((r) => {
        data[r.key] = r.items;
      });
      return { data };
    }

    const schoolMatch = url.match(/^\/sync\/school\/([^/]+)$/);
    if (schoolMatch) {
      const schoolId = decodeURIComponent(schoolMatch[1]);
      const rows = await localDB.schoolSharedData
        .where('schoolId')
        .equals(schoolId)
        .toArray();
      const data: Record<string, any> = {};
      rows.forEach((r) => {
        data[r.key] = r.data;
      });
      data.users = await localDB.users.toArray();
      return { data };
    }

    return { data: {} };
  },

  async post(url: string, payload?: any): Promise<{ data: any }> {
    await ensureSeedDatabase();

    if (url === '/sync/global' && payload?.key) {
      await saveSystemConfigToLocalDB(payload.key, payload.data);
      return { data: { success: true } };
    }

    if (url === '/sync/user' && payload) {
      const existing = payload.id ? await localDB.users.get(payload.id) : null;
      const stamped = stampRecord(payload, { id: payload.id, name: payload.name }, existing);
      await localDB.users.put(stamped);
      return { data: stamped };
    }

    if (url.startsWith('/sync/standalone/')) {
      const tableName = url.replace('/sync/standalone/', '').split('?')[0];
      const tableMap: Record<string, typeof localDB.gradeSheets> = {
        GradeSheets: localDB.gradeSheets,
        StudentGradeSheets: localDB.studentGradeSheets,
        AllSubjectsGradeSheets: localDB.allSubjectsGradeSheets,
        CaseStudies: localDB.caseStudies,
        issuesAndSolutions_log: localDB.issuesAndSolutions,
        SchoolActivities: localDB.schoolActivities,
      };
      const targetTable = tableMap[tableName];
      if (targetTable && payload) {
        const existing = payload.id ? await targetTable.get(payload.id) : null;
        const stamped = stampRecord(payload, null, existing);
        await targetTable.put(stamped);
        return { data: stamped };
      }
      return { data: payload };
    }

    const userMatch = url.match(/^\/sync\/school\/([^/]+)\/user\/([^/]+)\/data/);
    if (userMatch && payload?.key) {
      const schoolId = decodeURIComponent(userMatch[1]);
      const userId = decodeURIComponent(userMatch[2]);
      await saveUserCollectionToLocalDB(schoolId, userId, payload.key, payload.items);
      return { data: { success: true } };
    }

    const schoolMatch = url.match(/^\/sync\/school\/([^/]+)$/);
    if (schoolMatch && payload?.key) {
      const schoolId = decodeURIComponent(schoolMatch[1]);
      await saveSchoolSharedKeyToLocalDB(schoolId, payload.key, payload.data);
      return { data: { success: true } };
    }

    return { data: { success: true } };
  },

  async delete(url: string): Promise<{ data: any }> {
    await ensureSeedDatabase();

    if (url.startsWith('/sync/user/')) {
      const userId = decodeURIComponent(url.replace('/sync/user/', ''));
      await localDB.users.delete(userId);
      return { data: { success: true } };
    }

    const standaloneDelMatch = url.match(/^\/sync\/standalone\/([^/]+)\/(.+)$/);
    if (standaloneDelMatch) {
      const tableName = standaloneDelMatch[1];
      const docId = decodeURIComponent(standaloneDelMatch[2]);
      const tableMap: Record<string, typeof localDB.gradeSheets> = {
        GradeSheets: localDB.gradeSheets,
        StudentGradeSheets: localDB.studentGradeSheets,
        AllSubjectsGradeSheets: localDB.allSubjectsGradeSheets,
        CaseStudies: localDB.caseStudies,
        issuesAndSolutions_log: localDB.issuesAndSolutions,
        SchoolActivities: localDB.schoolActivities,
      };
      const targetTable = tableMap[tableName];
      if (targetTable) {
        await targetTable.delete(docId);
      }
      return { data: { success: true } };
    }

    return { data: { success: true } };
  },
};

export default api;
export { getUserCollectionFromLocalDB };
