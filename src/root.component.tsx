import { useMemo } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchCategories, type Category } from "./lib/category-utils";
import { CategoryPage } from "./components/CategoryPage";
import { HomePage } from "./components/HomePage";
import { SubmitProjectModalProvider } from "./components/SubmitProjectModal";
import "./styles/global.css";

function HomeRoute() {
  const navigate = useNavigate();
  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-600">
          Failed to load data. Please try again later.
        </div>
      </div>
    );
  }

  if (!categories) {
    return null;
  }

  return (
    <HomePage
      categories={categories}
      onCategoryClick={(categoryId) => {
        navigate(`/category/${categoryId}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}

function CategoryRoute() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const category: Category | undefined = useMemo(() => {
    if (!categories) return undefined;
    return categories.find((item) => item.id === categoryId);
  }, [categories, categoryId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-600">
          Failed to load data. Please try again later.
        </div>
      </div>
    );
  }

  if (!category) {
    return <Navigate to="/" replace />;
  }

  return (
    <CategoryPage
      category={category}
      onBack={() => {
        navigate("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}

export default function Root() {
  const location = useLocation();
  const isCategoryRoute = location.pathname.startsWith("/category/");

  return (
    <SubmitProjectModalProvider>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/category/:categoryId" element={<CategoryRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SubmitProjectModalProvider>
  );
}
