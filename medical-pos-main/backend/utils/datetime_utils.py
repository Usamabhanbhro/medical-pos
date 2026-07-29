"""
Utility functions for datetime handling with Pakistan timezone
"""
import datetime


def get_pakistan_time() -> datetime.datetime:
    """
    Get current time in Pakistan timezone (UTC+5)
    
    Returns:
        datetime.datetime: Current time in Pakistan timezone
    """
    utc_now = datetime.datetime.utcnow()
    pakistan_time = utc_now + datetime.timedelta(hours=5)
    return pakistan_time


def utc_to_pakistan(utc_time: datetime.datetime) -> datetime.datetime:
    """
    Convert UTC time to Pakistan time (UTC+5)
    
    Args:
        utc_time: datetime in UTC
        
    Returns:
        datetime.datetime: Time in Pakistan timezone
    """
    if utc_time is None:
        return None
    return utc_time + datetime.timedelta(hours=5)


def pakistan_to_utc(pakistan_time: datetime.datetime) -> datetime.datetime:
    """
    Convert Pakistan time to UTC
    
    Args:
        pakistan_time: datetime in Pakistan timezone
        
    Returns:
        datetime.datetime: Time in UTC
    """
    if pakistan_time is None:
        return None
    return pakistan_time - datetime.timedelta(hours=5)
