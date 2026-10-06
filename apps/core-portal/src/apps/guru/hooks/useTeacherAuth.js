import { useAuth } from '../../../shared/store/AuthContext';
import { parseTeacherRoles } from '../utils/roleHelper';

export function useTeacherAuth() {
  const auth = useAuth();
  const teacherRoles = parseTeacherRoles(auth.user);

  return {
    ...auth,
    teacherRoles,
    isHomeroom: teacherRoles.isHomeroom,
    isCounselor: teacherRoles.isCounselor,
    isCurriculum: teacherRoles.isCurriculum,
    isKesiswaan: teacherRoles.isKesiswaan,
    isAdminUnit: teacherRoles.isAdminUnit,
    isSubjectTeacher: teacherRoles.isSubjectTeacher,
    roleTitle: teacherRoles.primaryRoleName,
  };
}

