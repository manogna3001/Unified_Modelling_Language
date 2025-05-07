import React, { useContext } from 'react';
import { UserContext } from './UserContext';
import ReportedPosts from './ReportedPosts';  
import Typography from '@mui/material/Typography';

const ModeratorPanel = () => {
  const { user } = useContext(UserContext);

  if (!user || user.persona !== 'Moderator') {
    return <Typography>You do not have permission to access this page.</Typography>;
  }

  return (
    <div>
      <h2>Moderator Panel</h2>
      <ReportedPosts />
    </div>
  );
};

export default ModeratorPanel;