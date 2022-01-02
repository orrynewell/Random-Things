"""
Panda Issue Example
I had told a prior teammate to use iterrows for a process that was fundamentally wrong according to the documentation
and in practice. This is the prescribed solution for the issue we were facing.
"""


import pandas as pd


def create_dataframe():
    """
    Create The Dataframe
    :return: Dataframe for processing
    """
    data = {
        'mission': [' Mission1, Mission2, Mission 3 ',
                    'Mission 1',
                    'Mission 2',
                    'Mission 3',
                    'Mission 4'],
        'country': ['America',
                    'Not America',
                    'Not America',
                    'America',
                    'America'],
    }
    df = pd.DataFrame(data)
    df['Bin'] = '0'
    print("-----------------Original Dataframe------------------\n{}\n".format(df))
    return df


def clean_df(df):
    """
    Clean Dataframe - Our data contained comma delimanted list of items. These needed to be converted to a list. While
    this looks kind of sloppy, I think it was the best was to do it with our data.
    :param df: Original Dataframe
    :return: Cleaned Dataframe
    """
    df['mission'] = df['mission'].str.replace(" ", "").str.lower().str.split(',').tolist()
    print("-----------------Cleaned Dataframe------------------\n{}".format(df))
    print("-----Converts Mission Column from String to List-----\n")
    return df


def iter_row_method(df, country_mission):
    """
    This flat out doesnt work. Here is a documentation exert from pandas.pydata.org
    You should never modify something you are iterating over. This is not guaranteed to work in all cases.
    Depending on the data types, the iterator returns a copy and not a view, and writing to it will have no effect.
    :param df: Cleaned Dataframe
    :param country_mission: The country mission dictionary
    :return: nothing
    """
    for key, value in country_mission.items():
        print("Key being processed {}".format(key))
        mission_compare_standardized = [v.lower().replace(" ", "") for v in value]
        for index, row in df.iterrows():
            for mission in row.mission:
                if mission in mission_compare_standardized:
                    df.iloc[index, df.columns.get_loc('Bin')] = key
                    break
            df.loc[(df['country'] == key) & (df['Bin'] == '0'), 'Bin'] = key
    print("-----------------Iter Row Dataframe-----------------\n{}".format(df))
    print("------Makes the Updates at small scale probably-----\n")


def loc_method(df, country_mission):
    """
    Loc Method, correct way to do things.
    :param df: Cleaned Dataframe
    :param country_mission: The country mission dictionary
    :return: Nothing
    """
    for key, value in country_mission.items():
        mission_compare_standardized = [v.lower().replace(" ", "") for v in value]
        # The below lambda function is running against the individual list elements in mission.
        df.loc[df['mission'].apply(lambda local_mission: mission_compare_standardized in local_mission), 'Bin'] = key
        # The below boolean item catches items that fall into a country bin but do not have a mission.
        df.loc[(df['Bin'] == '0') & (df['country'] == key), 'Bin'] = key
    print("-------------------Loc Dataframe-------------------\n{}".format(df))
    print("------Makes the Updates at small scale probably-----")


def app():
    """
    App - Runs things
    :return: Nothing
    """
    country_mission = {
        "America": ["Mission 1",
                    "Mission 3"]
    }
    df = create_dataframe()
    df = clean_df(df)
    iter_row_method(df, country_mission)
    loc_method(df, country_mission)


if __name__ == '__main__':
    app()