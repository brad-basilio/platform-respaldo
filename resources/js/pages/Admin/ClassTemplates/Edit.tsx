import ClassTemplateForm from './Form';

interface AcademicLevel {
  id: number;
  name: string;
  code: string;
  color?: string;
}

interface TemplateQuestion {
  id?: number;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options: { text: string; is_correct: boolean }[];
  explanation?: string;
  points: number;
  is_active: boolean;
}

interface TemplateResource {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  file_size?: string;
  description?: string;
  download_count: number;
}

interface ClassTemplate {
  id: number;
  academic_level_id: number;
  title: string;
  session_number: string;
  modality: 'theoretical' | 'practical';
  description?: string;
  content?: string;
  objectives?: string;
  intro_video_url?: string;
  intro_video_thumbnail?: string;
  duration_minutes: number;
  order: number;
  has_exam: boolean;
  exam_questions_count: number;
  exam_passing_score: number;
  is_active: boolean;
  questions?: TemplateQuestion[];
  resources?: TemplateResource[];
  academic_level?: AcademicLevel;
}

interface Props {
  template: ClassTemplate;
  academicLevels: AcademicLevel[];
}

const Edit: React.FC<Props> = ({ template, academicLevels }) => {
  return <ClassTemplateForm template={template} academicLevels={academicLevels} />;
};

export default Edit;
