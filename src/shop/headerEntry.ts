import { Runtime } from 'foldkit';
import {
  Flags,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './header';

const element = Runtime.makeElement({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('site-header-root'),
});

Runtime.run(element);
