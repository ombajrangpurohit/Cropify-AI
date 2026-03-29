import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
def predict_disease(request):
    # 1. Catch the image file sent from React (the key 'image' matches your FormData)
    image_file = request.FILES.get('image')

    if not image_file:
        return Response(
            {"message": "No image provided."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    print(f"✅ Successfully received image: {image_file.name}")

    # 2. Simulate ML processing time (2 seconds)
    time.sleep(2) 

    # 3. Return the exact JSON structure your frontend expects
   # 3. Return the expanded JSON structure
    mock_result = {
        "name": "Tomato Early Blight",
        "confidence": "94.5%",
        "severity": "High",
        "weather_warning": "High humidity (82%) and warm temperatures (28°C) in your area are rapidly accelerating spore generation.",
        "symptoms": "Dark, concentric rings on older leaves, often surrounded by a yellow halo. Stem lesions and fruit rot may occur.",
        "reasons": "Caused by the fungus Alternaria solani. Spores survive in crop debris and are splashed onto lower leaves during heavy rain or bottom-watering.",
        "remedy": "1. Prune and destroy infected lower leaves immediately.\n2. Apply a copper-based organic fungicide.\n3. Switch to drip irrigation to keep foliage dry."
    }

    return Response(mock_result, status=status.HTTP_200_OK)