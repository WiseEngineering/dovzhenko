import { IncomingMessage, ServerResponse } from 'http';

import { Route } from './server';

class App {
  public routes!: Array<Route>;

  public append(eventName: string, cb: (req: IncomingMessage, res: ServerResponse) => void) {
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
