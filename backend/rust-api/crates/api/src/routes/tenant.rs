use axum::{routing::any, Router};

use crate::{auth::AuthUser, error::ApiError, state::AppState};

/// Tenant-scoped routes: users, roles, warehouses, branches, settings and
/// notifications. Any authenticated tenant member may reach them; handlers
/// enforce the finer permission once ported.
pub fn router() -> Router<AppState> {
    Router::new()
        // người dùng
        .route("/users", any(guard))
        .route("/users/:id", any(guard))
        .route("/users/invite", any(guard))
        .route("/users/:id/status", any(guard))
        // vai trò
        .route("/roles", any(guard))
        .route("/roles/:id", any(guard))
        // kho + ngăn xếp
        .route("/warehouses", any(guard))
        .route("/warehouses/:id", any(guard))
        .route("/warehouses/bins", any(guard))
        .route("/warehouses/bins/:id", any(guard))
        // chi nhánh
        .route("/branches", any(guard))
        .route("/branches/:id", any(guard))
        // cài đặt
        .route("/settings", any(guard))
        // thông báo
        .route("/notifications", any(guard))
        .route("/notifications/:id", any(guard))
        .route("/notifications/read-all", any(guard))
        .route("/notifications/send", any(guard))
        .route("/notifications/events", any(guard))
        // đơn phân chia
        .route("/order-partials", any(guard))
        .route("/order-partials/:id", any(guard))
        // khách hàng B2B
        .route("/customers", any(guard))
        .route("/customers/:id", any(guard))
        .route("/customers/:id/stat", any(guard))
        .route("/customers/:id/reviews", any(guard))
}

async fn guard(_user: AuthUser) -> ApiError {
    ApiError::NotImplemented
}
