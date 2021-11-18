import {
  IRequest, Route, IApp, IResponse,
} from './types';

class App implements IApp {
  public routes!: Array<Route>;

  public append(eventName: string, cb: (req: IRequest, res: IResponse) => Promise<void>) {
    const event = eventName;
    this.setupRoute({ route: eventName, cb });

    return {
      off: () => {
        this.routes = this.routes.filter(({ route }) => route === event);
      },
    };
  }

  private setupRoute({ route, cb }: Route): void {
    const normalizedRoute: Route = { route: App.normalizeRoute(route), cb };

    if (!this.routes?.length) {
      this.routes = [normalizedRoute];
    } else {
      this.routes = [...this.routes, normalizedRoute];
    }
  }

  private static normalizeRoute(route: string): string {
    if (route[0] === '/') {
      return route;
    }

    return `/${route}`;
  }
}

export default App;
