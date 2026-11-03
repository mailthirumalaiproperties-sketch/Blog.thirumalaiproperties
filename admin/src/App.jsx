import { lazy, Suspense } from "react";
import Layout from "./components/Layout.jsx";
import { Card, LoadingBlock, PageHeader } from "./components/ui.jsx";
import { ROLE_HELP, ROLE_LABELS, useAuth } from "./lib/auth.jsx";
import { Link, matchPath, useRouter } from "./lib/router.jsx";
import Activity from "./pages/Activity.jsx";
import Articles from "./pages/Articles.jsx";
import { ForcedPasswordChange, LoginPage, PasswordForm } from "./pages/Auth.jsx";
import Categories from "./pages/Categories.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MediaLibrary from "./pages/MediaLibrary.jsx";
import Seo from "./pages/Seo.jsx";
import Settings from "./pages/Settings.jsx";
import Users from "./pages/Users.jsx";

// The rich-text editor is large; load it only when an article is opened.
const ArticleEditor = lazy(() => import("./pages/ArticleEditor.jsx"));

function Account() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="My account" description={`${user.email} · ${ROLE_LABELS[user.role]}: ${ROLE_HELP[user.role]}`} />
      <Card title="Change password" className="max-w-lg">
        <PasswordForm />
      </Card>
    </>
  );
}

function NotFound() {
  return (
    <div className="text-center py-20">
      <p className="text-lg font-semibold text-stone-700">Page not found</p>
      <Link to="/" className="text-brand-gold font-semibold hover:underline">
        Go to the dashboard
      </Link>
    </div>
  );
}

const ROUTES = [
  { path: "/", render: () => <Dashboard /> },
  { path: "/articles", render: () => <Articles /> },
  { path: "/articles/:id", render: ({ id }) => <ArticleEditor id={id} /> },
  { path: "/categories", render: () => <Categories /> },
  { path: "/media", render: () => <MediaLibrary /> },
  { path: "/seo", render: () => <Seo /> },
  { path: "/settings", permission: "settings.manage", render: () => <Settings /> },
  { path: "/users", permission: "users.manage", render: () => <Users /> },
  { path: "/activity", permission: "activity.view", render: () => <Activity /> },
  { path: "/account", render: () => <Account /> },
];

export default function App() {
  const { user, ready, can } = useAuth();
  const { path } = useRouter();

  if (!ready) return <LoadingBlock />;
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <ForcedPasswordChange />;

  let page = <NotFound />;
  for (const route of ROUTES) {
    const params = matchPath(route.path, path);
    if (params) {
      page = route.permission && !can(route.permission) ? <NotFound /> : route.render(params);
      break;
    }
  }
  return (
    <Layout>
      <Suspense fallback={<LoadingBlock />}>{page}</Suspense>
    </Layout>
  );
}
