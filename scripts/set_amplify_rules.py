import boto3

client = boto3.client("amplify", region_name="us-east-1")

rules = [
    {
        "source": "</^/worker/missions/([^/]+)/complete/?.*$/>",
        "target": "/worker/missions/default/complete/index.html",
        "status": "200"
    },
    {
        "source": "/worker/missions/<*>",
        "target": "/worker/missions/default/index.html",
        "status": "200"
    },
    {
        "source": "/resident/reports/<*>",
        "target": "/resident/reports/default/index.html",
        "status": "200"
    },
    {
        "source": "/resident/verify/<*>",
        "target": "/resident/verify/default/index.html",
        "status": "200"
    },
    {
        "source": "/operations/missions/<*>",
        "target": "/operations/missions/default/index.html",
        "status": "200"
    },
    {
        "source": "/<*>",
        "target": "/index.html",
        "status": "404-200"
    }
]

res = client.update_app(
    appId="dpd7m9jmuhh6w",
    customRules=rules
)

print("Updated Amplify custom rules:")
for rule in res["app"]["customRules"]:
    print(rule)
