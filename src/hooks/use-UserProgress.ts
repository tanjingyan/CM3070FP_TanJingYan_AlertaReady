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

function calculateLevel(xp: number) {
  if (xp >= 1000) return 5;
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export function useUserProgress() {
  const [userData, setUserData] = useState<UserProgress>({
    displayName: 'User',
    email: '',
    xp: 0,
    preparedness: 0,
    level: 1,
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

      const currentXp = data.xp || 0;
      const currentPreparedness = data.preparedness || 0;

      const newXp = currentXp + reward;
      const newPreparedness = Math.min(currentPreparedness + 5, 100);
      const newLevel = calculateLevel(newXp);

      transaction.update(userRef, {
        xp: newXp,
        preparedness: newPreparedness,
        level: newLevel,
        completedTasks: [...completedTasks, taskName],
      });
    });
  }

  return {
    userData,
    completeTask,
  };
}