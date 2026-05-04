import type { FirebaseOptions } from 'firebase/app';

export const firebasePublicOptions: Omit<FirebaseOptions, 'apiKey'> = {
  authDomain: 'gastos-2b187.firebaseapp.com',
  projectId: 'gastos-2b187',
  storageBucket: 'gastos-2b187.firebasestorage.app',
  messagingSenderId: '946063305135',
  appId: '1:946063305135:web:ea140f9d8dec8572afa75a',
  measurementId: 'G-DY9MRK67CT',
};
