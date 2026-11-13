import { Route, Routes } from 'react-router-dom';
import { Ask } from './screens/Ask';
import { CreateGroup } from './screens/CreateGroup';
import { Group } from './screens/Group';
import { GroupSettings } from './screens/GroupSettings';
import { Home } from './screens/Home';
import { JoinCode } from './screens/JoinCode';
import { JoinLink } from './screens/JoinLink';
import { Question } from './screens/Question';
import { Settings } from './screens/Settings';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new" element={<CreateGroup />} />
      <Route path="/join" element={<JoinCode />} />
      <Route path="/j/:code" element={<JoinLink />} />
      <Route path="/g/:groupId" element={<Group />} />
      <Route path="/g/:groupId/ask" element={<Ask />} />
      <Route path="/g/:groupId/q/:questionId" element={<Question />} />
      <Route path="/g/:groupId/settings" element={<GroupSettings />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
