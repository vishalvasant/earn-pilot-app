/** Main stack (tabs + stack screens) */
export type MainStackParamList = {
  Tabs: undefined;
  TaskDetail: { taskId: number };
  quizzes: undefined;
  QuizPlay: { id: number };
  Withdraw: undefined;
};

/** Tab navigator screens */
export type TabParamList = {
  Home: undefined;
  Tasks: undefined;
  Wallet: undefined;
  Profile: undefined;
};

/** Root param list for React Navigation typing */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends MainStackParamList, TabParamList {}
  }
}
