import { Suspense, lazy, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Home } from './screens/Home';
import { JoinLink } from './screens/JoinLink';

const named = <K extends string>(load: () => Promise<Record<K, ComponentType>>, key: K) =>
  lazy(async () => ({ default: (await load())[key] }));

const Ask = named(() => import('./screens/Ask'), 'Ask');
const CreateGroup = named(() => import('./screens/CreateGroup'), 'CreateGroup');
const Group = named(() => import('./screens/Group'), 'Group');
const GroupSettings = named(() => import('./screens/GroupSettings'), 'GroupSettings');
const JoinCode = named(() => import('./screens/JoinCode'), 'JoinCode');
const Question = named(() => import('./screens/Question'), 'Question');
const Settings = named(() => import('./screens/Settings'), 'Settings');

export function App() {
  return (
    <Suspense
      fallback={
        <main className="screen" aria-busy="true">
          <span className="skeleton" style={{ blockSize: 120 }} />
        </main>
      }
    >
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
    </Suspense>
  );
}
