# Expressr 🛜
![Expressr banner](https://utfs.io/f/EVQsPnqldSbJK0rIZaRLG29qk3hfuBvgnlarzoedXV0MI6xY)

A light typescript based, easy to use, express server with dynamic folder routing.

### Introduction

Expressr is a template for NPM, that allows you to easily setup a very basic express server, with dynamic folder routing as you might see in Next.js.

### Installation instructions

_coming soon_

### Usage

Expressr is extremely easy to use. After you've setup the template locally, you can enter `npm run dev` to run it dev mode. You should then be able to run either Postman Insomnia, or your preferred api program, and route to localhost:{port}/status and get the example route.

#### Basic route

To create a new route, add a file inside the `routes` folder. E.g. `new-route.ts`

```
routes/
├─ new-route.ts  <--
```

Inside that, we'll create a basic get route.

```ts
// src/routes/new-route.ts
import { Request, Response } from "express";

export function get(req: Request, res: Response) {
  res.json({ message: "This is an example GET route" });
}

// We can also create a POST route the same way
export function post(req: Request, res: Response) {
  res.json({ message: "This is an example POST route" });
}
```

You should now be able to route to `localhost:{port}/new-route.ts`

#### Structure-only folders

You can put perenthesis around a folder name, and it'll be ignored by the router. You can use this to group things together in your editor to make development easier, but remove the structure from the api route.

Let's create some auth routes. I'll create `login.ts`, `register.ts` and `user.ts`:

```
routes/
├─ (auth)/  <--
│  ├─ login.ts
│  ├─ register.ts
│  ├─ user.ts/
├─ new-route.ts
```

In this case, you just route to `localhost:{port}/login` and the `(auth)` folder will be ignored.

#### Params

Like with the perenthesis folders, you can wrap your file name in brackets to get a param. I'll create a new folder file called `test/[test].ts`. In this case the param varable will be called test. Here's the folder structure:

```
routes/
├─ test/
│  ├─ [test].ts  <--
├─ (auth)/
│  ├─ login.ts
│  ├─ register.ts
│  ├─ user.ts/
├─ new-route.ts
```

Then get the param inside a get request:

```ts
// routes/test/[test].ts
import { Request, Response } from "express";

export function get(req: Request, res: Response) {
  res.json({
    message: `This is the param: ${req.params.test}`
  });
}
```

If you then route to `localhost:{port}/test/hello-world` it will return

```json
{
  "message": "This is the param: hello-world"
}
```

#### Final notes

And just like that, we have successfully setup and created a basic expressr server!
