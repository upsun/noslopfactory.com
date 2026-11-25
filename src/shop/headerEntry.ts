import { Runtime } from 'foldkit';
import {
  Flags,
  Model,
  SECTIONS,
  flags,
  init,
  subscriptions,
  update,
  viewFor,
} from './header';

const container = document.getElementById('site-header-root');
const section =
  SECTIONS.find((value) => value === container?.dataset['section']) ??
  'Project';

const element = Runtime.makeElement({
  Model,
  Flags,
  flags,
  init,
  update,
  view: viewFor(section),
  subscriptions,
  container,
});

Runtime.run(element);
