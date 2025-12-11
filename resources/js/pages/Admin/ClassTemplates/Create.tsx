import ClassTemplateForm from './Form';

interface AcademicLevel {
  id: number;
  name: string;
  code: string;
  color?: string;
}

interface Props {
  academicLevels: AcademicLevel[];
}

const Create: React.FC<Props> = ({ academicLevels }) => {
  return <ClassTemplateForm academicLevels={academicLevels} />;
};

export default Create;
