import { IncomingMessage, ServerResponse } from 'http';

import { IRequest, Route } from './server';

export interface IApp {
  routes: Array<Route>;
  append: (event: string, cb: (req: IncomingMessage, res: ServerResponse) => Promise<void>) => void;
}
class App implements IApp {
  public routes!: Array<Route>;

  public append(eventName: string, cb: (req: IRequest, res: ServerResponse) => Promise<void>) {
    const event = eventName;
    this.setupRoute({ route: eventName, cb });

    return {
      off: () => {
        this.routes = this.routes.filter(({ route }) => route === event);
      },
    };
  }

  private setupRoute({ route, cb }: Route): void {
    const normalizedRoute: Route = { route: this.normalizeRoute(route), cb };

    if (!this.routes?.length) {
      this.routes = [normalizedRoute];
    } else {
      this.routes = [...this.routes, normalizedRoute];
    }
  }

  private normalizeRoute(route: string): string {
    if (route[0] === '/') {
      return route;
    }

    return `/${route}`;
  }
}

export default App;
