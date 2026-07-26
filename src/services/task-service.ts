import type { Task } from '@/types/task';
export const remainingTaskCount=(tasks:Task[],visible=3)=>Math.max(0,tasks.length-visible);
export const toggleTaskSnapshot=(task:Task):Task=>({...task,isCompleted:!task.isCompleted});
