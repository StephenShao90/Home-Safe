Build a Toronto safety intelligence workflow for my Home Safe app.

Goal:
Create a notebook that ingests official Toronto public safety datasets and produces baseline safety scores for map cells and routes.

Requirements:
- Use official Toronto sources where possible
- Use Toronto Police Community Safety Indicators data
- Use Toronto Neighbourhood Crime Rates
- Use Toronto Neighbourhood Profiles for population density/context
- Use occurrence hour or reported hour for time-of-day features where available
- Do not fabricate data
- Keep the scoring transparent, explainable, and weighted
- Produce output by latitude/longitude cells and by daypart: morning, afternoon, evening, night
- Normalize scores to a 1-10 scale where 10 is safest
- Include component scores:
  - crime_component
  - time_component
  - density_component
  - transit_component
  - confidence
- Prepare output suitable for API deployment
- Expose a Python function for deployment:
  score_cells(cells: list[dict], hour: int) -> dict

Expected input cell format:
[
  { "cell_id": "abc", "lat": 43.6532, "lng": -79.3832 },
  ...
]

Expected output format:
{
  "cells": [
    {
      "cell_id": "abc",
      "lat": 43.6532,
      "lng": -79.3832,
      "baseline_score": 6.8,
      "crime_component": 5.9,
      "time_component": 6.1,
      "density_component": 7.2,
      "transit_component": 6.9,
      "confidence": 0.84,
      "bucket": "yellow"
    }
  ]
}