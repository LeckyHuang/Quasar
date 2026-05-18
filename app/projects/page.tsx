import { getData } from '@/lib/dataService';
import ProjectsClient from './ProjectsClient';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const { projects } = await getData();
  return <ProjectsClient projects={projects} />;
}
