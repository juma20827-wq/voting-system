from django.urls import path
from .views import (
    LoginView,
    PositionsView,
    CandidatesByPositionView,
    VoteView,
    ResultsView,
    AdminCandidateView,
    AdminCandidateDetailView,
    AdminPositionView,
    AdminPositionDetailView,
    AdminUserView,
    WinnersView,
    ResetElectionView,
    AdminUploadImageView,
    MeView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='api-login'),
    path('me/', MeView.as_view(), name='api-me'),
    path('positions/', PositionsView.as_view(), name='positions'),
    path('positions/<int:position_id>/candidates/', CandidatesByPositionView.as_view(), name='candidates-by-position'),
    path('vote/', VoteView.as_view(), name='vote'),
    path('results/', ResultsView.as_view(), name='results'),
    path('admin/candidates/', AdminCandidateView.as_view(), name='admin-candidates'),
    path('admin/candidates/<int:candidate_id>/', AdminCandidateDetailView.as_view(), name='admin-candidate-detail'),
    path('admin/positions/', AdminPositionView.as_view(), name='admin-positions'),
    path('admin/positions/<int:position_id>/', AdminPositionDetailView.as_view(), name='admin-position-detail'),
    path('admin/users/', AdminUserView.as_view(), name='admin-users'),
    path('admin/winners/', WinnersView.as_view(), name='admin-winners'),
    path('admin/upload-image/', AdminUploadImageView.as_view(), name='admin-upload-image'),
    path('admin/reset/', ResetElectionView.as_view(), name='admin-reset'),
]


# FINAL ADMIN CANDIDATE EDIT/DELETE ROUTE
from .views import AdminCandidateDetailFinalView
urlpatterns.insert(0, path("admin/candidates/<int:pk>/", AdminCandidateDetailFinalView.as_view(), name="admin-candidate-detail-final"))

# FINAL ADMIN CLEANUP ROUTES
from .views import AdminPositionDetailFinalView, AdminClearVotesFinalView

urlpatterns.insert(0, path("admin/positions/<int:pk>/", AdminPositionDetailFinalView.as_view(), name="admin-position-detail-final"))
urlpatterns.insert(0, path("admin/votes/clear/", AdminClearVotesFinalView.as_view(), name="admin-clear-votes-final"))

# FINAL ADMIN VOTERS + LEADERBOARD ROUTES
from .views import AdminVotersFinalView, AdminLeaderboardFinalView

urlpatterns.insert(0, path("admin/voters/", AdminVotersFinalView.as_view(), name="admin-voters-final"))
urlpatterns.insert(0, path("admin/leaderboard/", AdminLeaderboardFinalView.as_view(), name="admin-leaderboard-final"))
