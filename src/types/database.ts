export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: AdminUser;
        Insert: Omit<AdminUser, "id" | "created_at">;
        Update: Partial<Omit<AdminUser, "id" | "created_at">>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
        Relationships: [];
      };
      articles: {
        Row: Article;
        Insert: Omit<Article, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Article, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      article_images: {
        Row: ArticleImage;
        Insert: Omit<ArticleImage, "id" | "created_at">;
        Update: Partial<Omit<ArticleImage, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "article_images_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Order, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id">;
        Update: Partial<Omit<OrderItem, "id">>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      decrement_stock: {
        Args: { article_id: string; amount: number };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "superadmin" | "editor";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  status: "active" | "inactive";
  category_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleImage {
  id: string;
  article_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  status: "pending" | "paid" | "shipped" | "cancelled";
  total: number;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  article_id: string;
  quantity: number;
  unit_price: number;
}

export type ArticleWithImages = Article & { article_images: ArticleImage[] };
export type OrderWithItems = Order & {
  items: (OrderItem & { article: Pick<Article, "id" | "title" | "thumbnail_url"> })[];
};

export type CartItem = {
  article: Pick<Article, "id" | "title" | "price" | "thumbnail_url" | "slug" | "stock">;
  quantity: number;
};
