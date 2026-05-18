import { getData } from '@/lib/dataService';
import { Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import SkillsClient from './SkillsClient';

export const dynamic = 'force-dynamic';

export default async function SkillsPage() {
  const { skills } = await getData();
  return <SkillsClient skills={skills} />;
}
