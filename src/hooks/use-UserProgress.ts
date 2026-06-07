import { useEffect, useState } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

type UserProgress = {
  displayName: string;
  email: string;
  xp: number;
  preparedness: number;
  level: number;
  completedTasks: string[];
};

export function useUserProgress() {
  const [userData, setUserData] = useState<UserProgress>({
    displayName: 'User',
    email: '',
    xp: 650,
    preparedness: 65,
    level: 3,
    completedTasks: [],
  });

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        setUserData({
          displayName: data.displayName || user.displayName || 'User',
          email: data.email || user.email || '',
          xp: data.xp || 0,
          preparedness: data.preparedness || 0,
          level: data.level || 1,
          completedTasks: data.completedTasks || [],
        });
      }
    });

    return unsubscribe;
  }, []);

  async function completeTask(taskName: string, reward: number) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) return;

      const data = userDoc.data();
      const completedTasks = data.completedTasks || [];

      if (completedTasks.includes(taskName)) return;

      transaction.update(userRef, {
        xp: (data.xp || 0) + reward,
        preparedness: Math.min((data.preparedness || 0) + 5, 100),
        completedTasks: [...completedTasks, taskName],
      });
    });
  }

  return {
    userData,
    completeTask,
  };
}