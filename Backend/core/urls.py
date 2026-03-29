from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Forward any URL starting with 'api/' to your new app
    path('api/', include('api.urls')), 
]